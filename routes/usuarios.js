const express = require('express');
const router = express.Router();
const mysql = require('../mysql').pool;
const login = require('../middleware/login_mid');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

router.get('/dashboard', (req, res) => {
    res.sendFile(__basedir + '/public/pages/dashboard.html');
});

router.get('/cadastro', (req, res) => {
    res.sendFile(__basedir + '/public/pages/cadastro.html');
});

router.post('/cadastro', (req, res, next) => {
    mysql.getConnection((err, conn) => {

        if (err) { return res.status(500).send({ error: error }) }

        conn.query('SELECT * FROM usuario WHERE email = ?', [req.body.email], (error, results) => {
            if (error) { return res.status(500).send({ error: error }) }
            if (results.length > 0) {
                res.status(409).send({ mensagem: 'Email do usuário já cadastrada' })
            } else {
                conn.query('SELECT * FROM usuario WHERE CPF = ?', [req.body.cpf], (error, results) => {
                    if (error) { return res.status(500).send({ error: error }) }
                    if (results.length > 0) {
                        res.status(409).send({ mensagem: 'CPF do usuário já cadastrada' })
                    } else {

                        bcrypt.hash(req.body.senha, 10, (errBcrypt, hash) => {
                            if (errBcrypt) { return res.status(500).send({ error: errBcrypt }) }
                            conn.query(
                                `INSERT INTO usuario (nome, email, cpf, telefone, senha) VALUES (?,?,?,?,?)`,
                                [req.body.nome, req.body.email, req.body.cpf, req.body.telefone, hash],
                                (error, results) => {
                                    conn.release();
                                    if (error) { return res.status(500).send({ error: error }) }
                                    response = {
                                        mensagem: 'Usuário criado com sucesso',
                                        usuarioCriado: {
                                            id_usuario: results.insertId,
                                            Nome: req.body.nome,
                                            email: req.body.email,
                                            cpf: req.body.cpf,
                                            telefone: req.body.telefone,
                                            id_tipo_cargo: req.body.id_tipo_cargo

                                        }
                                    }
                                    return res.status(201).send(response)
                                })
                        });


                    }
                })


            }
        })
    });
});

router.post('/login', (req, res, next) => {
    console.log('entriu')
    console.log(req.body.email);
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        const query = `SELECT * FROM usuario WHERE email = ?`
        conn.query(query, [req.body.email], (error, results, fields) => {
            conn.release();
            if (error) { return res.status(500).send({ error: error }) }
            if (results.length < 1) {
                console.log('entriu 2')
                return res.status(401).send({ mensagem: 'Falha na autenticação 1' })
            }

            if (req.body.google) {

                let token = jwt.sign({
                    id_usuario: results[0].id,
                    Nome: results[0].nome,
                    email: results[0].email,
                    Cpf: results[0].cpf,
                    telefone: results[0].telefone,
                    id_tipo_cargo: results[0].id_tipo_cargo

                }, process.env.JWT_KEY,
                    {
                        expiresIn: "1h"
                    });
                return res.status(200).send({
                    mensagem: 'Autenticado com sucesso',
                    usuario: results,
                    token: token
                });



            } else {
                bcrypt.compare(req.body.senha, results[0].senha, (err, result) => {
                    if (err) {
                        console.log('entriu 3')
                        return res.status(401).send({ mensagem: 'Falha na autenticação 2' })
                    }
                    if (result) {
                        let token = jwt.sign({
                            id_usuario: results[0].id,
                            Nome: results[0].nome,
                            email: results[0].email,
                            Cpf: results[0].cpf,
                            telefone: results[0].telefone,
                            id_tipo_cargo: results[0].id_tipo_cargo

                        }, process.env.JWT_KEY,
                            {
                                expiresIn: "1h"
                            });
                        return res.status(200).send({
                            mensagem: 'Autenticado com sucesso',
                            usuario: results,
                            token: token
                        });
                    }
                    return res.status(401).send({ mensagem: 'Falha na autenticação 3' })
                });

            }


        });
    });
})

router.post('/login_adm', (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        const query = `SELECT * FROM usuario WHERE email = ?`
        conn.query(query, [req.body.email], (error, results, fields) => {
            conn.release();
            if (error) { return res.status(500).send({ error: error }) }
            if (results.length < 1) {
                return res.status(401).send({ mensagem: 'Falha na autenticação' })
            }
            if (results[0].id_tipo_cargo != 2) {
                return res.status(401).send({ mensagem: 'Ação não autorizada' })
            }
            bcrypt.compare(req.body.senha, results[0].senha, (err, result) => {
                if (error) { return res.status(401).send({ mensagem: 'Falha na autenticação' }) }
                if (result) {
                    let token = jwt.sign({
                        id_usuario: results[0].id,
                        Nome: results[0].nome,
                        email: results[0].email,
                        Cpf: results[0].cpf,
                        telefone: results[0].telefone,
                        id_tipo_cargo: results[0].id_tipo_cargo

                    }, process.env.JWT_KEY,
                        {
                            expiresIn: "1h"
                        });
                    return res.status(200).send({
                        mensagem: 'Autenticado com sucesso',
                        token: token
                    });
                }
                return res.status(401).send({ mensagem: 'Falha na autenticação' })
            });

        });
    });
})

router.get('/lista', login.obrigatorio, (req, res, next) => {
    console.log(req.usuario)
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'SELECT * FROM usuario;',
            (error, result, field) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
                const response = {
                    tamanho: result.length,
                    produtos: result.map(listauser => {
                        return {
                            usuarios: {
                                id: listauser.id,
                                Nome: listauser.nome,
                                Email: listauser.email,
                                Cpf: listauser.cpf,
                                Numero: listauser.telefone,
                                id_tipo_cargo: listauser.id_tipo_cargo
                            },
                            Request: {
                                tipo: 'GET',
                                descricao: 'Retorna os detalhes de uma questao específico',
                                url: 'http://localhost:3000/usuarios/lista/' + listauser.id

                            }
                        }

                    })
                }
                return res.status(200).send(response)
            }
        )
    });
})

router.get('/lista/:id_user', login.obrigatorio, (req, res, next) => {
    console.log(req.params.id_user)
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'SELECT * FROM usuario WHERE id = ?;',
            [req.params.id_user],
            (error, result, field) => {
                if (error) { return res.status(500).send({ error: error }) }

                if (result.length == 0) {
                    return res.status(404).send({
                        mensagem: 'Não foi encontrado usuario com esse ID'
                    })
                }
                const response = {

                    usuario: {
                        id: result[0].id,
                        Nome: result[0].nome,
                        Email: result[0].email,
                        Cpf: result[0].cpf,
                        Numero: result[0].telefone,
                        id_tipo_cargo: result[0].id_tipo_cargo
                    },
                    Request: {
                        tipo: 'GET',
                        descricao: 'Retorna os produtos',
                        url: 'http://localhost:3000/usuarios/lista'
                    }
                }
                return res.status(201).send(response)
            }
        )
    });

});

router.get('/:email', (req, res, next) => {
    mysql.getConnection((error, conn) => {
        if (error) { return res.status(500).send({ error: error }) }
        conn.query(
            'SELECT * FROM usuario where email = ?;', [req.params.email],
            (error, result, field) => {
                conn.release();
                if (error) { return res.status(500).send({ error: error }) }
                const response = {
                    tamanho: result.length,
                    email: result.email
                }
                return res.status(200).send(response)
            }
        )
    });
})







module.exports = router;





